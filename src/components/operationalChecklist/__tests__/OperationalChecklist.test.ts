import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, reactive, ref } from 'vue'
import OperationalChecklist from '../OperationalChecklist.vue'
import ReminderList from '../ReminderList.vue'
import { snapshot } from './fixtures'
import { useOperationalChecklistStore } from '@/store/operationalChecklist'
const mocks = vi.hoisted(() => ({ today: vi.fn(), check: vi.fn(), on: vi.fn(), off: vi.fn(), error: vi.fn(), auth: {} as any, branch: {} as any }))
vi.mock('@/services/MainAPI/operationalChecklistApi', () => ({ operationalChecklistApi: { today: mocks.today, check: mocks.check } }))
vi.mock('@/store/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/store/branchContext', () => ({ useBranchContextStore: () => mocks.branch }))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: mocks.error }) }))
vi.mock('@/composables/useSignalR', () => ({ useSignalR: () => ({ on: mocks.on, off: mocks.off, connectionState: ref('connected') }) }))
let wrapper: VueWrapper | undefined
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T15:00:00Z')); setActivePinia(createPinia())
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  mocks.auth = reactive({ user: { id: 10, branchName: 'Sucursal de prueba' }, branchId: 1, isSuperadmin: false, isAdmin: false })
  mocks.branch = reactive({ selectedBranchId: 1, selectedBranch: { name: 'Sucursal de prueba' }, markDirty: vi.fn() })
  mocks.today.mockReset(); mocks.check.mockReset(); mocks.on.mockReset(); mocks.off.mockReset()
  mocks.today.mockImplementation(async () => snapshot({ serverTimeUtc: new Date().toISOString() }))
})
afterEach(() => { wrapper?.unmount(); wrapper = undefined; document.body.innerHTML = ''; vi.useRealTimers() })
const start = async () => { wrapper = mount(OperationalChecklist, { attachTo: document.body }); await flushPromises(); return wrapper }
describe('checklist toolbar', () => {
  it('shows both badges, including conditional and administrator items; cashier has no config action', async () => {
    const w = await start(); const buttons = w.findAll('button[aria-haspopup="dialog"]')
    expect(buttons).toHaveLength(2); expect(buttons[0]!.attributes('aria-label')).toContain('2 tareas'); expect(buttons[1]!.attributes('aria-label')).toContain('1 tareas')
    await buttons[0]!.trigger('click'); await flushPromises(); expect(document.body.textContent).toContain('Tarea 2'); expect(document.body.textContent).not.toContain('Configurar')
    document.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await nextTick(); expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
  it('opens the optional reminder once at 10:30 and closing does not mark anything', async () => {
    await start(); await vi.advanceTimersByTimeAsync(30 * 60_000 + 200); await flushPromises()
    const modal = document.querySelector('.checklist-reminder-modal')!; expect(modal).toBeTruthy()
    const close = [...modal.querySelectorAll('button')].find(x => x.textContent === 'Cerrar')!; close.click(); await nextTick()
    expect(document.querySelector('.checklist-reminder-modal')).toBeNull(); expect(mocks.check).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(60_000); expect(document.querySelector('.checklist-reminder-modal')).toBeNull()
    expect(useOperationalChecklistStore().pending('morning')).toBe(2)
  })
  it('defers its modal while a payment or other modal is open', async () => {
    const other = document.createElement('div'); other.setAttribute('role', 'dialog'); other.setAttribute('aria-modal', 'true'); document.body.appendChild(other)
    await start(); await vi.advanceTimersByTimeAsync(30 * 60_000 + 200); expect(document.querySelector('.checklist-reminder-modal')).toBeNull()
    other.remove(); await vi.advanceTimersByTimeAsync(15_000); expect(document.querySelector('.checklist-reminder-modal')).not.toBeNull()
  })
  it('shows only the evening group when the POS opens after 18:00', async () => {
    vi.setSystemTime(new Date('2026-11-15T23:15:00Z')); await start()
    const modal = document.querySelector('.checklist-reminder-modal')!; expect(modal.textContent).toContain('Tarea 3'); expect(modal.textContent).not.toContain('Tarea 1')
  })
  it('does not remind when there are no unchecked items', async () => {
    mocks.today.mockImplementation(async () => snapshot({ serverTimeUtc: new Date().toISOString(), items: [] })); await start()
    await vi.advanceTimersByTimeAsync(30 * 60_000 + 200); expect(document.querySelector('.checklist-reminder-modal')).toBeNull()
  })
  it('reloads shared state only for realtime events in the active branch', async () => {
    await start(); const listener = mocks.on.mock.calls.find(x => x[0] === 'OperationalChecklistChanged')![1]
    listener({ branchId: 2 }); await flushPromises(); expect(mocks.today).toHaveBeenCalledTimes(1)
    listener({ branchId: 1 }); await flushPromises(); expect(mocks.today).toHaveBeenCalledTimes(2)
  })
  it('shows the exact description with keyboard focus and emits independent checkbox events', async () => {
    wrapper = mount(ReminderList, { props: { items: snapshot().items, busyIds: [] }, attachTo: document.body })
    await wrapper.findAll('input')[0]!.setValue(true); expect(wrapper.emitted('check')?.[0]).toEqual([1, true])
    await wrapper.get('button[aria-label="Ayuda: Tarea 1"]').trigger('focusin'); await nextTick()
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Descripción exacta 1')
  })
})
