import { defineComponent, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useSessionViewState } from '../useSessionViewState'

const auth = reactive({ user: { id: 7 }, userRole: 'Admin' })
const branch = reactive({ revision: 1 })
vi.mock('@/store/auth', () => ({ useAuthStore: () => auth }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => branch }))

describe('session view state', () => {
    it('restores a screen on return and isolates workspace changes', () => {
        let state: ReturnType<typeof useSessionViewState<{ page: number }>>
        const view = defineComponent({ setup() { state = useSessionViewState('test', { page: 1 }); return () => null } })
        const first = mount(view)
        state!.value.page = 4
        first.unmount()
        const second = mount(view)
        expect(state!.value.page).toBe(4)
        branch.revision++
        second.unmount()
        const third = mount(view)
        expect(state!.value.page).toBe(1)
        state!.value.page = 9
        auth.user.id = 8
        third.unmount()
        const fourth = mount(view)
        expect(state!.value.page).toBe(1)
        fourth.unmount()
    })
})
