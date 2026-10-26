import { flushPromises, shallowMount } from '@vue/test-utils'
import { reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import View from '@/views/BranchDetail.vue'

const mocks = vi.hoisted(() => ({ branch: vi.fn().mockResolvedValue(undefined), banks: vi.fn().mockResolvedValue(undefined), apps: vi.fn().mockResolvedValue(undefined) }))
const route = reactive({ params: { id: '1' }, query: { section: 'general' } })
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ replace: vi.fn() }), RouterLink: { template: '<a><slot /></a>' } }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => ({ user: { id: 7, role: 'Admin', branchId: 1 }, userRole: 'Admin', isAdmin: true }) }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => ({ selectedBranchId: 1, markDirty: vi.fn() }) }))
vi.mock('@/store/branches', () => ({ useBranchesStore: () => ({ current: { id: 1, name: 'Test', users: [], neighborhoods: [] }, fetchById: mocks.branch }) }))
vi.mock('@/store/banks', () => ({ useBanksStore: () => ({ list: null, ensureListLoaded: mocks.banks }) }))
vi.mock('@/store/apps', () => ({ useAppsStore: () => ({ list: null, ensureListLoaded: mocks.apps }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))

describe('branch section loading', () => {
    it('loads no bank/app catalogs for general information and requests them once when opened', async () => {
        const wrapper = shallowMount(View)
        await flushPromises()
        expect(mocks.branch).toHaveBeenCalledOnce()
        expect(mocks.banks).not.toHaveBeenCalled()
        expect(mocks.apps).not.toHaveBeenCalled()
        route.query.section = 'banks-apps'
        await flushPromises()
        expect(mocks.banks).toHaveBeenCalledWith(1)
        expect(mocks.apps).toHaveBeenCalledWith(1)
        route.query.section = 'general'; await flushPromises()
        route.query.section = 'banks-apps'; await flushPromises()
        expect(mocks.banks).toHaveBeenCalledOnce()
        wrapper.unmount()
    })
})
