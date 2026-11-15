import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOperationalChecklistStore } from '../operationalChecklist'
import { snapshot } from '@/components/operationalChecklist/__tests__/fixtures'
const mock = vi.hoisted(() => ({ today: vi.fn(), check: vi.fn() }))
vi.mock('@/services/MainAPI/operationalChecklistApi', () => ({ operationalChecklistApi: mock }))
const deferred = <T>() => { let resolve!: (v: T) => void, reject!: (e: Error) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
beforeEach(() => { setActivePinia(createPinia()); mock.today.mockReset(); mock.check.mockReset(); mock.today.mockResolvedValue(snapshot()) })
describe('shared branch checklist', () => {
  it('counts conditional tasks without hiding administration tasks', async () => {
    const s = useOperationalChecklistStore(); s.setScope('10:1'); await s.load()
    expect(s.pending('morning')).toBe(2); expect(s.pending('evening')).toBe(1)
  })
  it('deduplicates reads and discards responses from a previous branch', async () => {
    const old = deferred<ReturnType<typeof snapshot>>(); mock.today.mockReturnValueOnce(old.promise)
    const s = useOperationalChecklistStore(); s.setScope('10:1'); const first = s.load(); const second = s.load()
    expect(mock.today).toHaveBeenCalledTimes(1)
    s.setScope('10:2'); mock.today.mockResolvedValue(snapshot({ branchId: 2 })); await s.load()
    old.resolve(snapshot()); await Promise.all([first, second]); expect(s.snapshot?.branchId).toBe(2)
  })
  it('sends explicit state and version, optimistically marks and persists the server revision', async () => {
    const wait = deferred<any>(); mock.check.mockReturnValue(wait.promise)
    const s = useOperationalChecklistStore(); s.setScope('10:1'); await s.load()
    const action = s.setChecked(1, true)
    expect(s.pending('morning')).toBe(1); expect(s.busyIds).toEqual([1])
    await s.setChecked(1, true); expect(mock.check).toHaveBeenCalledTimes(1)
    expect(mock.check).toHaveBeenCalledWith(1, '2026-11-15', true, 0)
    wait.resolve({ reminder: snapshot().items[0]!.reminder, isChecked: true, stateRevision: 1 }); await action
    expect(s.items[0]?.stateRevision).toBe(1); expect(s.busyIds).toEqual([])
  })
  it('reconciles a failed mutation instead of leaving a false saved check', async () => {
    mock.check.mockRejectedValue(new Error('Conflicto'))
    const s = useOperationalChecklistStore(); s.setScope('10:1'); await s.load()
    mock.today.mockResolvedValue(snapshot())
    await expect(s.setChecked(1, true)).rejects.toThrow('Conflicto'); await flushPromises()
    expect(s.items[0]?.isChecked).toBe(false); expect(mock.today).toHaveBeenCalledTimes(2)
  })
  it('never applies an old branch mutation response to the newly selected branch', async () => {
    const wait = deferred<any>(); mock.check.mockReturnValue(wait.promise)
    const s = useOperationalChecklistStore(); s.setScope('10:1'); await s.load(); const action = s.setChecked(1, true)
    s.setScope('10:2'); mock.today.mockResolvedValue(snapshot({ branchId: 2 })); await s.load()
    wait.resolve({ ...snapshot().items[0], isChecked: true, stateRevision: 7 }); await action
    expect(s.snapshot?.branchId).toBe(2); expect(s.items[0]?.isChecked).toBe(false)
  })
  it('defers realtime refresh until in-flight changes finish', async () => {
    const wait = deferred<any>(); mock.check.mockReturnValue(wait.promise)
    const s = useOperationalChecklistStore(); s.setScope('10:1'); await s.load(); const action = s.setChecked(1, true)
    await s.load(); expect(mock.today).toHaveBeenCalledTimes(1)
    wait.resolve({ ...snapshot().items[0], isChecked: true, stateRevision: 1 }); await action; await flushPromises()
    expect(mock.today).toHaveBeenCalledTimes(2)
  })
  it('clears state and errors on logout and accepts a fresh date', async () => {
    const s = useOperationalChecklistStore(); s.setScope('10:1'); await s.load()
    s.setScope(''); expect(s.snapshot).toBeNull(); expect(s.items).toEqual([])
    s.setScope('10:1'); mock.today.mockResolvedValue(snapshot({ operationDate: '2026-11-16' })); await s.load()
    expect(s.snapshot?.operationDate).toBe('2026-11-16')
  })
})
