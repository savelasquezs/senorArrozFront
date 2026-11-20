import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from '../Sidebar.vue'

const api = vi.hoisted(() => ({ getOperationalStatus: vi.fn() }))
const harness = vi.hoisted(() => ({
  auth: null as any, branch: null as any, route: null as any,
  whatsapp: null as any, delivery: null as any,
}))
vi.mock('@/services/MainAPI/integrationApi', () => ({ integrationApi: api }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => harness.auth }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => harness.branch }))
vi.mock('@/store/whatsapp', () => ({ useWhatsAppStore: () => harness.whatsapp }))
vi.mock('@/store/delivery', () => ({ useDeliveryStore: () => harness.delivery }))
vi.mock('@/helpers/employeeAccountAccess', () => ({
  accountCanVisit: () => true, isTerminalAccount: () => false,
}))
vi.mock('vue-router', () => ({
  useRoute: () => harness.route,
  useRouter: () => ({ currentRoute: { value: harness.route }, push: vi.fn() }),
}))

function deferred() {
  let resolve!: (value: any) => void
  let reject!: (error: Error) => void
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function status(branchId: number, pending: number) {
  return { data: { rappi: { branchId, ready: true }, pending } }
}
function mountSidebar() {
  return shallowMount(Sidebar, {
    props: { isOpen: true },
    global: { stubs: { 'router-link': { template: '<a><slot /></a>' } } },
  })
}
async function flush() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}
async function expandApps(wrapper: ReturnType<typeof mountSidebar>) {
  const button = wrapper.findAll('button').find(item => item.text().trim() === 'Apps')
  if (!button) throw new Error('Apps menu missing')
  await button.trigger('click')
}

describe('Sidebar Rappi status polling M40-F05', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    harness.auth = reactive({
      isAuthenticated: true, isSuperadmin: true, isDeliveryman: false,
      isAdmin: false, userRole: 'Superadmin', userName: 'Operador',
      user: { id: 1, branchId: 1 }, branchName: 'Sucursal',
    })
    harness.branch = reactive({ selectedBranchId: 1, revision: 1, selectedBranch: { name: 'Sucursal' } })
    harness.route = reactive({ path: '/orders', query: {} })
    harness.whatsapp = reactive({ enabled: false, unreadTotal: 0, ensureStatus: vi.fn().mockResolvedValue({ enabled: false }) })
    harness.delivery = reactive({ historyBadgeCount: 0, requestHistoryModalFromSidebar: vi.fn() })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shares one HTTP read when mount and branch revision overlap', async () => {
    const first = deferred()
    api.getOperationalStatus.mockReturnValue(first.promise)
    const wrapper = mountSidebar()
    expect(api.getOperationalStatus).toHaveBeenCalledExactlyOnceWith(1)
    harness.branch.revision++
    await nextTick()
    expect(api.getOperationalStatus).toHaveBeenCalledTimes(1)
    first.resolve(status(1, 3))
    await flush()
    await expandApps(wrapper)
    expect(wrapper.text()).toContain('Rappi (3)')
    wrapper.unmount()
  })

  it('prevents an older branch response from restoring the wrong menu', async () => {
    const old = deferred(), current = deferred()
    api.getOperationalStatus.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const wrapper = mountSidebar()
    harness.branch.selectedBranchId = 2
    harness.branch.revision++
    await nextTick()
    expect(api.getOperationalStatus).toHaveBeenNthCalledWith(2, 2)
    current.resolve(status(2, 2))
    await flush()
    await expandApps(wrapper)
    expect(wrapper.text()).toContain('Rappi (2)')
    old.resolve(status(1, 9))
    await flush()
    expect(wrapper.text()).toContain('Rappi (2)')
    expect(wrapper.text()).not.toContain('Rappi (9)')
    wrapper.unmount()
  })

  it('does not launch another periodic GET while the previous request is pending', async () => {
    const first = deferred()
    api.getOperationalStatus.mockReturnValue(first.promise)
    const wrapper = mountSidebar()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.getOperationalStatus).toHaveBeenCalledTimes(1)
    first.resolve(status(1, 1))
    await flush()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(api.getOperationalStatus).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('ignores a previous response after losing authorization and clears the badge', async () => {
    const first = deferred()
    api.getOperationalStatus.mockReturnValue(first.promise)
    const wrapper = mountSidebar()
    harness.auth.isAuthenticated = false
    await nextTick()
    first.resolve(status(1, 12))
    await flush()
    expect(wrapper.text()).not.toContain('Rappi (12)')
    expect(api.getOperationalStatus).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('can retry after a failed request without hiding a newer success', async () => {
    api.getOperationalStatus.mockRejectedValueOnce(new Error('network')).mockResolvedValue(status(1, 4))
    const wrapper = mountSidebar()
    await flush()
    expect(wrapper.text()).not.toContain('Rappi (4)')
    harness.branch.revision++
    await nextTick()
    await flush()
    expect(api.getOperationalStatus).toHaveBeenCalledTimes(2)
    await expandApps(wrapper)
    expect(wrapper.text()).toContain('Rappi (4)')
    wrapper.unmount()
  })
  it('starts a fresh GET after logout and login while the old request is pending', async () => {
    const previous = deferred(), fresh = deferred()
    api.getOperationalStatus.mockReturnValueOnce(previous.promise).mockReturnValueOnce(fresh.promise)
    const wrapper = mountSidebar()
    harness.auth.isAuthenticated = false
    await nextTick()
    harness.auth.isAuthenticated = true
    await nextTick()
    expect(api.getOperationalStatus).toHaveBeenCalledTimes(2)
    fresh.resolve(status(1, 5))
    await flush()
    previous.resolve(status(1, 11))
    await flush()
    await expandApps(wrapper)
    expect(wrapper.text()).toContain('Rappi (5)')
    expect(wrapper.text()).not.toContain('Rappi (11)')
    wrapper.unmount()
  })

})
