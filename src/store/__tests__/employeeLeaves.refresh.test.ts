import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/auth';
import { useAuthStore } from '@/store/auth';
import { useEmployeeLeavesStore } from '../employeeLeaves';

const api = vi.hoisted(() => ({ summary: vi.fn(), catalog: vi.fn() }));
vi.mock('@/services/MainAPI/employeeLeaveApi', () => ({ employeeLeaveApi: api }));
vi.mock('@/store/auth', async () => {
  const { defineStore } = await import('pinia'); const { ref, computed } = await import('vue');
  return { useAuthStore: defineStore('test-leave-auth', () => {
    const user = ref<User | null>(null);
    return { user, isAuthenticated: computed(() => !!user.value), isAdmin: computed(() => user.value?.role === 'Admin'), isSuperadmin: computed(() => user.value?.role === 'Superadmin') };
  }) };
});
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const summary = (n: number) => ({ unread: n, pendingReview: n });
describe('employee leave shared reads', () => {
  beforeEach(() => {
    setActivePinia(createPinia()); api.summary.mockReset(); api.catalog.mockReset();
    useAuthStore().user = { id: 7, name: 'Test', email: 'test@example.invalid', phone: '', active: true, role: 'Admin', accountType: 'personal', branchId: 1, branchName: 'Test' };
  });
  afterEach(() => disposePinia(getActivePinia()!));
  it('shares an initial summary between navigation and page consumers', async () => {
    const gate = deferred<ReturnType<typeof summary>>(); api.summary.mockReturnValue(gate.promise);
    const store = useEmployeeLeavesStore(); const first = store.refreshSummary(), second = store.refreshSummary();
    await Promise.resolve(); expect(api.summary).toHaveBeenCalledTimes(1);
    gate.resolve(summary(1)); await Promise.all([first, second]); expect(store.summary.unread).toBe(1);
  });
  it('does not lose an event during a pending summary and deduplicates its subscribers', async () => {
    const gate = deferred<ReturnType<typeof summary>>(); api.summary.mockReturnValueOnce(gate.promise).mockResolvedValueOnce(summary(2));
    const store = useEmployeeLeavesStore(); const first = store.refreshSummary(); await Promise.resolve();
    const options = { invalidate: true, change: { publicId: 'A', version: 2 } };
    const second = store.refreshSummary(options), third = store.refreshSummary(options);
    gate.resolve(summary(1)); await Promise.all([first, second, third]);
    expect(api.summary).toHaveBeenCalledTimes(2); expect(store.summary.unread).toBe(2);
    await store.refreshSummary(options); expect(api.summary).toHaveBeenCalledTimes(2);
  });
  it('a failed summary remains retryable for the same version', async () => {
    api.summary.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(summary(3));
    const store = useEmployeeLeavesStore(), options = { invalidate: true, change: { publicId: 'A', version: 3 } };
    await store.refreshSummary(options); await store.refreshSummary(options);
    expect(api.summary).toHaveBeenCalledTimes(2); expect(store.summary.unread).toBe(3);
  });
  it('aborts an old identity and never applies its late summary', async () => {
    const gate = deferred<ReturnType<typeof summary>>(); api.summary.mockReturnValueOnce(gate.promise).mockResolvedValueOnce(summary(2));
    const store = useEmployeeLeavesStore(); const first = store.refreshSummary(); await Promise.resolve();
    const signal = api.summary.mock.calls[0]![0] as AbortSignal;
    useAuthStore().user = { ...useAuthStore().user!, id: 8, role: 'Cashier' };
    expect(signal.aborted).toBe(true); expect(store.summary.unread).toBe(0);
    const second = store.refreshSummary(); gate.resolve(summary(99)); await Promise.all([first, second]);
    expect(store.summary.unread).toBe(2);
  });
  it('logout does not allow a late response to refill private counters', async () => {
    const gate = deferred<ReturnType<typeof summary>>(); api.summary.mockReturnValue(gate.promise);
    const store = useEmployeeLeavesStore(); const pending = store.refreshSummary(); await Promise.resolve();
    useAuthStore().user = null; gate.resolve(summary(99)); await pending;
    expect(store.summary).toEqual(summary(0)); expect(api.summary).toHaveBeenCalledTimes(1);
  });
  it('terminal accounts do not request personal counters or catalog', async () => {
    useAuthStore().user = { ...useAuthStore().user!, accountType: 'terminal' };
    const store = useEmployeeLeavesStore(); await store.refreshSummary(); await store.loadKinds();
    expect(api.summary).not.toHaveBeenCalled(); expect(api.catalog).not.toHaveBeenCalled();
  });
  it('coalesces concurrent catalog loads', async () => {
    const values = [{ code: 'test', label: 'Test', paidByCompanyPolicy: false }];
    const gate = deferred<typeof values>(); api.catalog.mockReturnValue(gate.promise);
    const store = useEmployeeLeavesStore(); const one = store.loadKinds(), two = store.loadKinds();
    expect(api.catalog).toHaveBeenCalledTimes(1); gate.resolve(values); await Promise.all([one, two]);
    await store.loadKinds(); expect(api.catalog).toHaveBeenCalledTimes(1);
  });
  it('reloads a used catalog after a role change without reusing the old identity', async () => {
    const previous = [{ code: 'before', label: 'Before', paidByCompanyPolicy: false }];
    const current = [{ code: 'after', label: 'After', paidByCompanyPolicy: false }];
    api.catalog.mockResolvedValueOnce(previous).mockResolvedValueOnce(current); api.summary.mockResolvedValue(summary(0));
    const store = useEmployeeLeavesStore(); await store.loadKinds();
    useAuthStore().user = { ...useAuthStore().user!, role: 'Cashier' };
    await store.loadKinds(); await store.refreshSummary();
    expect(api.catalog).toHaveBeenCalledTimes(2); expect(store.kinds).toEqual(current);
  });
  it('changing identity in navigation alone does not fetch the unused catalog', async () => {
    api.summary.mockResolvedValue(summary(0)); const store = useEmployeeLeavesStore();
    useAuthStore().user = { ...useAuthStore().user!, id: 8 };
    await store.refreshSummary(); expect(api.catalog).not.toHaveBeenCalled();
  });
  it('disposal aborts summary and drops a queued refresh', async () => {
    const gate = deferred<ReturnType<typeof summary>>(); api.summary.mockReturnValue(gate.promise);
    const store = useEmployeeLeavesStore(); const first = store.refreshSummary(); await Promise.resolve();
    store.invalidate(); const signal = api.summary.mock.calls[0]![0] as AbortSignal; store.$dispose();
    expect(signal.aborted).toBe(true); gate.resolve(summary(99)); await first;
    expect(api.summary).toHaveBeenCalledTimes(1); expect(store.summary.unread).toBe(0);
  });
});
